package finance

import (
	"fmt"
	"math/big"
)

type Line struct {
	AccountID string `json:"account_id"`
	Side      string `json:"side"`
	Money     Money  `json:"money"`
}

// ValidateJournal uses exact rationals; no rounding or float conversion is permitted.
func ValidateJournal(lines []Line) error {
	if len(lines) < 2 {
		return fmt.Errorf("journal requires at least two lines")
	}
	totals := map[string]*big.Rat{}
	for _, l := range lines {
		if !canonicalUUID(l.AccountID) || l.Money.Validate() != nil {
			return fmt.Errorf("invalid account or money")
		}
		n, ok := new(big.Rat).SetString(l.Money.Amount)
		if !ok || n.Sign() <= 0 {
			return fmt.Errorf("amount must be positive")
		}
		if l.Side == "credit" {
			n.Neg(n)
		} else if l.Side != "debit" {
			return fmt.Errorf("invalid side")
		}
		if totals[l.Money.Currency] == nil {
			totals[l.Money.Currency] = new(big.Rat)
		}
		totals[l.Money.Currency].Add(totals[l.Money.Currency], n)
	}
	for _, n := range totals {
		if n.Sign() != 0 {
			return fmt.Errorf("journal must balance per currency")
		}
	}
	return nil
}
func Reverse(lines []Line) []Line {
	out := append([]Line(nil), lines...)
	for i := range out {
		if out[i].Side == "debit" {
			out[i].Side = "credit"
		} else {
			out[i].Side = "debit"
		}
	}
	return out
}
