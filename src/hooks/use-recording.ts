import { useCallback, useEffect, useState } from "react";
import type { BindingKind } from "@/src/hooks/use-bindings";
import type { KeyBinding } from "@/src/utils/key-binding";

const MODIFIER_CODES = [
	"ControlLeft",
	"ControlRight",
	"ShiftLeft",
	"ShiftRight",
	"AltLeft",
	"AltRight",
	"MetaLeft",
	"MetaRight",
];

function isModifier(code: string): boolean {
	return MODIFIER_CODES.includes(code);
}

interface UseRecordingOptions {
	setBinding: (
		pedal: number,
		kind: BindingKind,
		binding: KeyBinding | null,
	) => void;
}

interface RecordingTarget {
	pedal: number;
	kind: BindingKind;
}

export function useRecording({ setBinding }: UseRecordingOptions) {
	const [recording, setRecording] = useState<RecordingTarget | null>(null);

	useEffect(() => {
		if (recording === null) return;
		const { pedal, kind } = recording;

		function handleKeyDown(event: KeyboardEvent) {
			event.preventDefault();
			event.stopPropagation();

			if (event.code === "Escape") {
				setRecording(null);
				return;
			}

			if (isModifier(event.code)) {
				return;
			}

			const binding: KeyBinding = {
				ctrl: event.ctrlKey,
				shift: event.shiftKey,
				alt: event.altKey,
				meta: event.metaKey,
				code: event.code,
			};

			setRecording(null);
			setBinding(pedal, kind, binding);
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [recording, setBinding]);

	const toggleRecording = useCallback((pedal: number, kind: BindingKind) => {
		setRecording((current) =>
			current?.pedal === pedal && current.kind === kind
				? null
				: { pedal, kind },
		);
	}, []);

	return { recording, toggleRecording };
}
