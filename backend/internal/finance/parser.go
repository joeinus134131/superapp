package finance

import (
	"regexp"
	"strings"
)

// Parser plugins produce draft evidence only; they have no database or posting capability.
type Parser interface {
	ID() string
	Version() string
	Parse(Document) Extraction
}
type EvidenceSpan struct {
	Field string `json:"field"`
	Start int    `json:"start_byte"`
	End   int    `json:"end_byte"`
	Text  string `json:"text"`
}
type Extraction struct {
	ParserID      string                 `json:"parser_id"`
	ParserVersion string                 `json:"parser_version"`
	Fields        map[string]interface{} `json:"fields"`
	Evidence      []EvidenceSpan         `json:"evidence"`
	QualityFlags  []string               `json:"quality_flags"`
}
type SyntheticParser struct{}

func (SyntheticParser) ID() string      { return "synthetic-idr-notification" }
func (SyntheticParser) Version() string { return "1" }

var syntheticPattern = regexp.MustCompile(`^SYNTHETIC ONLY: pembayaran merchant contoh IDR ([1-9][0-9]*); rekening belum dipetakan\.$`)

func (p SyntheticParser) Parse(d Document) Extraction {
	out := Extraction{ParserID: p.ID(), ParserVersion: p.Version(), Fields: map[string]interface{}{}, Evidence: []EvidenceSpan{}, QualityFlags: []string{"manual_review_required"}}
	// Both explicit metadata and fixture marker are required. No real bank support.
	if d.Metadata["synthetic"] != true || d.Text == nil {
		out.QualityFlags = append(out.QualityFlags, "unsupported_template")
		return out
	}
	text := *d.Text
	m := syntheticPattern.FindStringSubmatchIndex(text)
	if m == nil {
		out.QualityFlags = append(out.QualityFlags, "unsupported_template")
		return out
	}
	amount := text[m[2]:m[3]]
	if (Money{amount, "IDR"}).Validate() != nil {
		out.QualityFlags = append(out.QualityFlags, "invalid_amount")
		return out
	}
	out.Fields = map[string]interface{}{"money": Money{amount, "IDR"}, "direction": "expense", "account_id": nil, "occurred_date": nil, "synthetic": true}
	out.Evidence = append(out.Evidence, EvidenceSpan{"money.amount", m[2], m[3], amount})
	out.QualityFlags = append(out.QualityFlags, "synthetic_fixture_only", "account_unresolved", "date_unresolved")
	return out
}
func ExtractDraft(d Document) Extraction {
	// Reserved for deterministic plugins backed by anonymized samples. LLM output
	// must undergo the same review path and cannot obtain a posting capability.
	out := (SyntheticParser{}).Parse(d)
	if len(out.Fields) == 0 {
		out = (BankTemplates{}).Parse(d)
	}
	if d.Text != nil {
		upper := strings.ToUpper(*d.Text)
		if strings.Contains(upper, "OTP") || strings.Contains(upper, "PASSWORD") || strings.Contains(upper, "PIN RESET") {
			out.Fields = map[string]interface{}{}
			out.Evidence = []EvidenceSpan{}
			out.QualityFlags = append(out.QualityFlags, "sensitive_content_manual_handling")
		}
	}
	return out
}
