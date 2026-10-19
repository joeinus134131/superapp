package finance

import "testing"

func TestForecastDoesNotCreateMoneyOrDoubleCountEarmarks(t *testing.T) {
	input := ForecastInput{AsOf: "2026-10-16", Through: "2026-10-19", Currency: "IDR", CashFloor: Money{"10", "IDR"}, Flows: []ForecastFlow{{"2026-10-17", "outflow", Money{"40", "IDR"}, "synthetic rent"}, {"2026-10-18", "inflow", Money{"5", "IDR"}, "synthetic receipt"}}}
	out, err := CalculateForecast(input, "100", "20")
	if err != nil {
		t.Fatal(err)
	}
	if out.OneTimeCapacity != "30" || out.Points[2].Cash != "65" {
		t.Fatal("cash/earmark formula incorrect", out)
	}
	out, err = CalculateForecast(input, "100", "70")
	if err != nil || out.OneTimeCapacity != "0" {
		t.Fatal("negative capacity not floored", out, err)
	}
	input.Flows = []ForecastFlow{{"2026-10-17", "inflow", Money{"0.1", "IDR"}, "test"}, {"2026-10-17", "inflow", Money{"0.2", "IDR"}, "test"}}
	input.CashFloor.Amount = "0"
	out, err = CalculateForecast(input, "999999999999999999.01", "0")
	if err != nil || out.Points[1].Cash != "999999999999999999.31" {
		t.Fatal("decimal precision lost", out, err)
	}
	input.Flows[0].Money.Currency = "USD"
	if _, err = CalculateForecast(input, "1", "0"); err == nil {
		t.Fatal("cross currency netted")
	}
}
