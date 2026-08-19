import { useCallback, useEffect, useState } from "react";
import type { KeyBinding } from "@/components/pedal";

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
	setBinding: (pedal: number, binding: KeyBinding | null) => void;
}

export function useRecording({ setBinding }: UseRecordingOptions) {
	const [recordingPedal, setRecordingPedal] = useState<number | null>(null);

	useEffect(() => {
		if (recordingPedal === null) return;
		const pedal = recordingPedal;

		function handleKeyDown(event: KeyboardEvent) {
			event.preventDefault();
			event.stopPropagation();

			if (event.code === "Escape") {
				setRecordingPedal(null);
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

			setRecordingPedal(null);
			setBinding(pedal, binding);
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [recordingPedal, setBinding]);

	const toggleRecording = useCallback((pedal: number) => {
		setRecordingPedal((current) => (current === pedal ? null : pedal));
	}, []);

	return { recordingPedal, toggleRecording };
}
