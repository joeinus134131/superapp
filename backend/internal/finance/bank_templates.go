package finance

import (
	"fmt"
	"regexp"
	"strings"
)

// Bank identity is a review hint, not evidence of account ownership or sender authenticity.
type BankTemplateRegistration struct {
	Bank          string `json:"bank"`
	ParserID      string `json:"parser_id"`
	ParserVersion string `json:"parser_version"`
	SampleSHA256  string `json:"sample_sha256"`
	SampleClass   string `json:"sample_class"` // synthetic_only or reviewed_anonymized
}
type registeredTemplate struct {
	manifest BankTemplateRegistration
	parser   Parser
	matches  func(Document) bool
}
type BankTemplates struct{ templates []registeredTemplate }

func (r *BankTemplates) Register(m BankTemplateRegistration, p Parser, matches func(Document) bool) error {
	if (m.Bank != "BRI" && m.Bank != "BNI") || p == nil || matches == nil || m.ParserID != p.ID() || m.ParserVersion != p.Version() || m.ParserID == "" || m.ParserVersion == "" || !regexp.MustCompile(`^[a-f0-9]{64}$`).MatchString(m.SampleSHA256) || (m.SampleClass != "synthetic_only" && m.SampleClass != "reviewed_anonymized") {
		return fmt.Errorf("reviewed sample manifest and explicit template matcher required")
	}
	for _, existing := range r.templates {
		if existing.manifest.ParserID == m.ParserID && existing.manifest.ParserVersion == m.ParserVersion {
			return fmt.Errorf("template version already registered")
		}
	}
	r.templates = append(r.templates, registeredTemplate{m, p, matches})
	return nil
}
func (r BankTemplates) Parse(d Document) Extraction {
	for _, t := range r.templates {
		if t.matches(d) {
			out := t.parser.Parse(d)
			out.QualityFlags = append(out.QualityFlags, "manual_review_required", "account_ownership_unconfirmed")
			if t.manifest.SampleClass == "synthetic_only" {
				out.QualityFlags = append(out.QualityFlags, "synthetic_fixture_only")
			}
			return out
		}
	}
	hint, _ := d.Metadata["bank_hint"].(string)
	hint = strings.ToUpper(hint)
	out := Extraction{ParserID: "bank-template-unresolved", ParserVersion: "1", Fields: map[string]interface{}{}, Evidence: []EvidenceSpan{}, QualityFlags: []string{"manual_review_required", "unsupported_template", "account_unresolved", "sender_unverified"}}
	if hint == "BRI" || hint == "BNI" {
		out.Fields["bank_hint"] = hint
		out.QualityFlags = append(out.QualityFlags, "bank_hint_not_ownership")
	}
	return out
}

// No bank template is registered until an actual reviewed sample exists.
func BankTemplateCatalog() []map[string]interface{} {
	return []map[string]interface{}{
		{"bank": "BRI", "parser_ready": false, "state": "awaiting_anonymized_sample", "ownership": "unconfirmed", "sender": "unconfirmed"},
		{"bank": "BNI", "parser_ready": false, "state": "awaiting_anonymized_sample", "ownership": "unconfirmed", "sender": "unconfirmed"},
	}
}
