package finance

import (
	"encoding/json"
	"os"
	"testing"
)

func TestSyntheticParserEvidence(t *testing.T) {
	b, err := os.ReadFile("../../../shared/finance/import-event-v1.synthetic.json")
	if err != nil {
		t.Fatal(err)
	}
	var e ImportEvent
	if err = json.Unmarshal(b, &e); err != nil {
		t.Fatal(err)
	}
	out := ExtractDraft(e.Document)
	money, ok := out.Fields["money"].(Money)
	if !ok || money.Amount != "250000" || money.Currency != "IDR" {
		t.Fatal(out)
	}
	span := out.Evidence[0]
	if (*e.Document.Text)[span.Start:span.End] != span.Text {
		t.Fatal("untraceable amount")
	}
	e.Document.Metadata["synthetic"] = false
	if len(ExtractDraft(e.Document).Fields) != 0 {
		t.Fatal("real bank claimed supported")
	}
	e.Document.Metadata["synthetic"] = true
	text := "OTP 123456"
	e.Document.Text = &text
	if len(ExtractDraft(e.Document).Fields) != 0 {
		t.Fatal("sensitive text extracted")
	}
}
