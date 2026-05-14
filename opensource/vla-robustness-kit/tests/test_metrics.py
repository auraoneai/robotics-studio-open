from vla_robustness_kit.metrics import recommendations, summarize


def test_summary_reports_family_rates_and_clusters():
    summary = summarize([
        {"family": "language", "passed": True, "cluster": "none"},
        {"family": "language", "passed": False, "cluster": "language_phase"},
    ])
    assert summary["pass_rate"] == 0.5
    assert summary["family_rates"]["language"] == 0.5
    assert recommendations(summary)

