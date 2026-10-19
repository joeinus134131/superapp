package finance

import (
	"fmt"
	"math/big"
	"sort"
	"strings"
	"time"
)

func amount(s string) *big.Rat { n, _ := new(big.Rat).SetString(s); return n }
func decimalString(n *big.Rat) string {
	s := strings.TrimRight(strings.TrimRight(n.FloatString(8), "0"), ".")
	if s == "" || s == "-0" {
		return "0"
	}
	return s
}

type ForecastFlow struct {
	Date      string `json:"date"`
	Kind      string `json:"kind"`
	Money     Money  `json:"money"`
	SourceRef string `json:"source_ref"`
}
type ForecastInput struct {
	AsOf      string         `json:"as_of"`
	Through   string         `json:"through"`
	Currency  string         `json:"currency"`
	CashFloor Money          `json:"cash_floor"`
	Flows     []ForecastFlow `json:"flows"`
}
type ForecastPoint struct {
	Date                 string `json:"date"`
	Cash                 string `json:"cash"`
	UnreservedAfterFloor string `json:"unreserved_after_floor"`
}
type ForecastOutput struct {
	FormulaVersion  string          `json:"formula_version"`
	Currency        string          `json:"currency"`
	Opening         string          `json:"opening"`
	Earmarked       string          `json:"earmarked"`
	CashFloor       string          `json:"cash_floor"`
	OneTimeCapacity string          `json:"one_time_capacity"`
	Coverage        string          `json:"coverage"`
	Warnings        []string        `json:"warnings"`
	Points          []ForecastPoint `json:"points"`
	Assumptions     ForecastInput   `json:"assumptions"`
}

func CalculateForecast(input ForecastInput, opening, reserved string) (ForecastOutput, error) {
	out := ForecastOutput{FormulaVersion: "cash-floor-current-earmarks-v1", Currency: input.Currency, Opening: opening, Earmarked: reserved, CashFloor: input.CashFloor.Amount, Coverage: "configured_cash_accounts_only", Warnings: []string{"Current earmarks applied; this is not a historical reservation reconstruction.", "Only supplied dated cashflow assumptions are included; source coverage may be incomplete."}, Assumptions: input}
	start, e1 := time.Parse("2006-01-02", input.AsOf)
	end, e2 := time.Parse("2006-01-02", input.Through)
	if e1 != nil || e2 != nil || !end.After(start) || end.Sub(start) > 366*24*time.Hour || input.CashFloor.Validate() != nil || input.CashFloor.Currency != input.Currency || len(input.Flows) > 1000 {
		return out, fmt.Errorf("invalid forecast horizon, currency or cash floor")
	}
	cash, earmark, floor := amount(opening), amount(reserved), amount(input.CashFloor.Amount)
	if cash == nil || earmark == nil || earmark.Sign() < 0 {
		return out, fmt.Errorf("invalid snapshot")
	}
	flows := append([]ForecastFlow(nil), input.Flows...)
	sort.SliceStable(flows, func(i, j int) bool { return flows[i].Date < flows[j].Date })
	for _, flow := range flows {
		d, err := time.Parse("2006-01-02", flow.Date)
		if err != nil || !d.After(start) || d.After(end) || flow.Money.Validate() != nil || flow.Money.Currency != input.Currency || amount(flow.Money.Amount).Sign() <= 0 || (flow.Kind != "inflow" && flow.Kind != "outflow") || flow.SourceRef == "" || len(flow.SourceRef) > 160 {
			return out, fmt.Errorf("invalid dated flow assumption")
		}
	}
	available := func() *big.Rat { return new(big.Rat).Sub(new(big.Rat).Sub(cash, earmark), floor) }
	minimum := available()
	out.Points = []ForecastPoint{{input.AsOf, decimalString(cash), decimalString(minimum)}}
	index := 0
	for date := start.AddDate(0, 0, 1); !date.After(end); date = date.AddDate(0, 0, 1) {
		day := date.Format("2006-01-02")
		for index < len(flows) && flows[index].Date == day {
			n := amount(flows[index].Money.Amount)
			if flows[index].Kind == "outflow" {
				cash.Sub(cash, n)
			} else {
				cash.Add(cash, n)
			}
			index++
		}
		free := available()
		if free.Cmp(minimum) < 0 {
			minimum.Set(free)
		}
		out.Points = append(out.Points, ForecastPoint{day, decimalString(cash), decimalString(free)})
	}
	if minimum.Sign() < 0 {
		out.Warnings = append(out.Warnings, "Projected cash falls below current earmarks plus cash floor.")
		minimum.SetInt64(0)
	}
	out.OneTimeCapacity = decimalString(minimum)
	return out, nil
}
