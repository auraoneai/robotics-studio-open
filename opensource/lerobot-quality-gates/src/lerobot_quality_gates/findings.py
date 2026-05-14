from __future__ import annotations

from dataclasses import dataclass


SEVERITY_ORDER = {"none": 99, "low": 1, "medium": 2, "high": 3, "critical": 4}


@dataclass(frozen=True)
class Finding:
    gate: str
    severity: str
    message: str
    path: str
    remediation: str

    def to_dict(self) -> dict[str, str]:
        return {
            "gate": self.gate,
            "severity": self.severity,
            "message": self.message,
            "path": self.path,
            "remediation": self.remediation,
        }


def finding(gate: str, severity: str, message: str, path: str, remediation: str) -> Finding:
    return Finding(gate=gate, severity=severity, message=message, path=path, remediation=remediation)
