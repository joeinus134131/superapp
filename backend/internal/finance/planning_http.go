package finance

import (
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"math/big"
	"time"
)

func (h coreHandler) goals(c *fiber.Ctx) error {
	var rows []struct {
		ID          string `json:"id"`
		DisplayName string `json:"display_name"`
		Currency    string `json:"currency"`
		Target      string `json:"target"`
		DueDate     string `json:"due_date"`
		Allocated   string `json:"allocated"`
	}
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, false); err != nil {
			return err
		}
		return tx.Raw("SELECT g.id,g.display_name,g.currency,g.target::text,g.due_date::text,coalesce(sum(a.amount),0)::text AS allocated FROM financial_goals g LEFT JOIN goal_allocations a ON a.goal_id=g.id AND a.entity_id=g.entity_id WHERE g.entity_id=? GROUP BY g.id ORDER BY g.due_date,g.id", c.Params("entity")).Scan(&rows).Error
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.JSON(fiber.Map{"schema_version": "1", "goals": rows, "basis": "earmarks_not_additional_assets"})
}
func (h coreHandler) createGoal(c *fiber.Ctx) error {
	var req struct {
		ID          string `json:"id"`
		DisplayName string `json:"display_name"`
		Target      Money  `json:"target"`
		DueDate     string `json:"due_date"`
	}
	if c.BodyParser(&req) != nil || !canonicalUUID(req.ID) || len(req.DisplayName) < 1 || len(req.DisplayName) > 120 || req.Target.Validate() != nil || amount(req.Target.Amount).Sign() <= 0 {
		return failure(c, 422, "invalid_goal", "UUID, name, positive decimal target and date required")
	}
	if _, err := time.Parse("2006-01-02", req.DueDate); err != nil {
		return failure(c, 422, "invalid_goal_date", "Date must be YYYY-MM-DD")
	}
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, true); err != nil {
			return err
		}
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", req.ID).Error; err != nil {
			return err
		}
		var old struct {
			DisplayName string
			Currency    string
			Target      string
			DueDate     string
		}
		r := tx.Raw("SELECT display_name,currency,target::text,due_date::text FROM financial_goals WHERE entity_id=? AND id=?", c.Params("entity"), req.ID).Scan(&old)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected > 0 {
			if old.DisplayName != req.DisplayName || old.Currency != req.Target.Currency || amount(old.Target).Cmp(amount(req.Target.Amount)) != 0 || old.DueDate != req.DueDate {
				return ErrConflict
			}
			return nil
		}
		return tx.Exec("INSERT INTO financial_goals(id,entity_id,display_name,currency,target,due_date) VALUES(?,?,?,?,?,?)", req.ID, c.Params("entity"), req.DisplayName, req.Target.Currency, req.Target.Amount, req.DueDate).Error
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.Status(201).JSON(fiber.Map{"schema_version": "1", "goal_id": req.ID})
}
func (h coreHandler) allocateGoal(c *fiber.Ctx) error {
	var req struct {
		AccountID        string `json:"account_id"`
		Money            Money  `json:"money"`
		ExpectedRevision int64  `json:"expected_revision"`
	}
	key := c.Get("Idempotency-Key")
	if !canonicalUUID(c.Params("id")) || key == "" || len(key) > 128 || c.BodyParser(&req) != nil || !canonicalUUID(req.AccountID) || req.Money.Validate() != nil || req.ExpectedRevision < 0 {
		return failure(c, 422, "invalid_allocation", "Goal/account UUID, decimal money, expected revision and key required")
	}
	encoded, _ := json.Marshal(fiber.Map{"goal_id": c.Params("id"), "request": req})
	hash := digest(encoded)
	var result json.RawMessage
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, true); err != nil {
			return err
		}
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", c.Params("entity")).Error; err != nil {
			return err
		}
		var prior struct {
			BodySHA256 string
			Result     string
		}
		r := tx.Raw("SELECT body_sha256,result::text FROM planning_actions WHERE entity_id=? AND idempotency_key=?", c.Params("entity"), key).Scan(&prior)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected > 0 {
			if prior.BodySHA256 != hash {
				return ErrConflict
			}
			result = json.RawMessage(prior.Result)
			return nil
		}
		var goal struct {
			Currency string
			Target   string
		}
		r = tx.Raw("SELECT currency,target::text FROM financial_goals WHERE entity_id=? AND id=?", c.Params("entity"), c.Params("id")).Scan(&goal)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected != 1 || goal.Currency != req.Money.Currency {
			return ErrUnauthorized
		}
		var account struct {
			Currency string
			Kind     string
		}
		r = tx.Raw("SELECT currency,kind FROM financial_accounts WHERE entity_id=? AND id=? AND state='active'", c.Params("entity"), req.AccountID).Scan(&account)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected != 1 || account.Currency != goal.Currency || (account.Kind != "bank" && account.Kind != "cash" && account.Kind != "ewallet") {
			return ErrUnauthorized
		}
		var priorAllocation struct {
			Revision int64
			Amount   string
		}
		if err := tx.Raw("SELECT revision,amount::text FROM goal_allocations WHERE entity_id=? AND goal_id=? AND account_id=?", c.Params("entity"), c.Params("id"), req.AccountID).Scan(&priorAllocation).Error; err != nil {
			return err
		}
		previous := priorAllocation.Revision
		if priorAllocation.Amount == "" {
			priorAllocation.Amount = "0"
		}
		if previous != req.ExpectedRevision {
			return ErrConflict
		}
		var balance, otherAccount, otherGoal string
		if err := tx.Raw("SELECT coalesce(sum(CASE l.side WHEN 'debit' THEN l.amount ELSE -l.amount END),0)::text FROM journal_lines l JOIN journal_entries e ON e.id=l.entry_id WHERE l.entity_id=? AND l.account_id=? AND e.effective_date<=(now() AT TIME ZONE 'UTC')::date", c.Params("entity"), req.AccountID).Scan(&balance).Error; err != nil {
			return err
		}
		if err := tx.Raw("SELECT coalesce(sum(amount),0)::text FROM goal_allocations WHERE entity_id=? AND account_id=? AND goal_id<>?", c.Params("entity"), req.AccountID, c.Params("id")).Scan(&otherAccount).Error; err != nil {
			return err
		}
		if err := tx.Raw("SELECT coalesce(sum(amount),0)::text FROM goal_allocations WHERE entity_id=? AND goal_id=? AND account_id<>?", c.Params("entity"), c.Params("id"), req.AccountID).Scan(&otherGoal).Error; err != nil {
			return err
		}
		if (amount(req.Money.Amount).Cmp(amount(priorAllocation.Amount)) > 0 && new(big.Rat).Add(amount(otherAccount), amount(req.Money.Amount)).Cmp(amount(balance)) > 0) || new(big.Rat).Add(amount(otherGoal), amount(req.Money.Amount)).Cmp(amount(goal.Target)) > 0 {
			return ErrConflict
		}
		if err := tx.Exec("INSERT INTO goal_allocations(entity_id,goal_id,account_id,amount,revision) VALUES(?,?,?,?,?) ON CONFLICT(goal_id,account_id) DO UPDATE SET amount=excluded.amount,revision=excluded.revision", c.Params("entity"), c.Params("id"), req.AccountID, req.Money.Amount, previous+1).Error; err != nil {
			return err
		}
		result, _ = json.Marshal(fiber.Map{"schema_version": "1", "goal_id": c.Params("id"), "account_id": req.AccountID, "amount": req.Money.Amount, "currency": req.Money.Currency, "revision": previous + 1, "basis": "earmark_not_journal"})
		return tx.Exec("INSERT INTO planning_actions(id,entity_id,actor_user_id,idempotency_key,body_sha256,result) VALUES(?,?,?,?,?,?::jsonb)", uuid.NewString(), c.Params("entity"), user(c), key, hash, string(result)).Error
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.Type("json").Send(result)
}
func (h coreHandler) forecast(c *fiber.Ctx) error {
	var req ForecastInput
	key := c.Get("Idempotency-Key")
	if c.BodyParser(&req) != nil || key == "" || len(key) > 128 {
		return failure(c, 422, "invalid_forecast", "Forecast input and Idempotency-Key required")
	}
	if _, err := CalculateForecast(req, "0", "0"); err != nil {
		return failure(c, 422, "invalid_forecast", err.Error())
	}
	encoded, _ := json.Marshal(req)
	hash := digest(encoded)
	var result json.RawMessage
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := membership(tx, c, false); err != nil {
			return err
		}
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", c.Params("entity")).Error; err != nil {
			return err
		}
		var prior struct {
			BodySHA256 string
			Output     string
		}
		r := tx.Raw("SELECT body_sha256,output::text FROM planning_runs WHERE entity_id=? AND actor_user_id=? AND idempotency_key=?", c.Params("entity"), user(c), key).Scan(&prior)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected > 0 {
			if prior.BodySHA256 != hash {
				return ErrConflict
			}
			result = json.RawMessage(prior.Output)
			return nil
		}
		var n int64
		if err := tx.Raw("SELECT count(*) FROM financial_accounts WHERE entity_id=? AND currency=? AND kind IN ('bank','cash','ewallet')", c.Params("entity"), req.Currency).Scan(&n).Error; err != nil {
			return err
		}
		if n == 0 {
			return ErrConflict
		}
		var opening, reserved string
		if err := tx.Raw("SELECT coalesce(sum(CASE l.side WHEN 'debit' THEN l.amount ELSE -l.amount END),0)::text FROM journal_lines l JOIN journal_entries e ON e.id=l.entry_id JOIN financial_accounts a ON a.id=l.account_id AND a.entity_id=l.entity_id WHERE l.entity_id=? AND a.currency=? AND a.kind IN ('bank','cash','ewallet') AND e.effective_date<=?", c.Params("entity"), req.Currency, req.AsOf).Scan(&opening).Error; err != nil {
			return err
		}
		if err := tx.Raw("SELECT coalesce(sum(a.amount),0)::text FROM goal_allocations a JOIN financial_goals g ON g.id=a.goal_id AND g.entity_id=a.entity_id WHERE a.entity_id=? AND g.currency=?", c.Params("entity"), req.Currency).Scan(&reserved).Error; err != nil {
			return err
		}
		output, err := CalculateForecast(req, opening, reserved)
		if err != nil {
			return err
		}
		runID := uuid.NewString()
		result, _ = json.Marshal(fiber.Map{"schema_version": "1", "run_id": runID, "forecast": output})
		return tx.Exec("INSERT INTO planning_runs(id,entity_id,actor_user_id,idempotency_key,body_sha256,input,output) VALUES(?,?,?,?,?,?::jsonb,?::jsonb)", runID, c.Params("entity"), user(c), key, hash, string(encoded), string(result)).Error
	})
	if err != nil {
		return coreError(c, err)
	}
	return c.Type("json").Send(result)
}
