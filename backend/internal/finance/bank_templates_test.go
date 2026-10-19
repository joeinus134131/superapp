package finance

import "testing"

func TestUnknownBankTemplatesStayManual(t *testing.T) {
	for _, bank := range []string{"BRI", "BNI"} {
		text := "unverified bank notification amount 999"
		d := Document{Text: &text, Metadata: map[string]interface{}{"bank_hint": bank}}
		out := ExtractDraft(d)
		if out.Fields["money"] != nil || out.Fields["account_id"] != nil || out.Fields["bank_hint"] != bank {
			t.Fatal("unknown bank was parsed/mapped", out)
		}
	}
	var registry BankTemplates
	if registry.Register(BankTemplateRegistration{Bank: "BRI"}, SyntheticParser{}, func(Document) bool { return true }) == nil {
		t.Fatal("template without sample admitted")
	}
	manifest := BankTemplateRegistration{Bank: "BNI", ParserID: (SyntheticParser{}).ID(), ParserVersion: "1", SampleSHA256: digest([]byte("synthetic only")), SampleClass: "synthetic_only"}
	if err := registry.Register(manifest, SyntheticParser{}, func(d Document) bool { return d.Metadata["synthetic"] == true }); err != nil {
		t.Fatal(err)
	}
	if err := registry.Register(manifest, SyntheticParser{}, func(Document) bool { return true }); err == nil {
		t.Fatal("template version overwritten")
	}
	for _, item := range BankTemplateCatalog() {
		if item["parser_ready"] != false {
			t.Fatal("real bank support claimed")
		}
	}
}
