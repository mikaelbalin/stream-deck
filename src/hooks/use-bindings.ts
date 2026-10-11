import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { KeyBinding, PedalBinding } from "@/src/utils/key-binding";

export type BindingKind = "tap" | "hold";

export function useBindings() {
	const [bindings, setBindings] = useState<PedalBinding[]>([
		{ tap: null, hold: null, holdPress: false },
		{ tap: null, hold: null, holdPress: false },
		{ tap: null, hold: null, holdPress: false },
	]);
	const [thresholdMs, setThresholdMs] = useState(500);

	useEffect(() => {
		let disposed = false;

		invoke<PedalBinding[]>("get_bindings")
			.then((b) => {
				if (!disposed) setBindings(b);
			})
			.catch(() => {});

		invoke<number>("get_threshold")
			.then((t) => {
				if (!disposed) setThresholdMs(t);
			})
			.catch(() => {});

		return () => {
			disposed = true;
		};
	}, []);

	const setBinding = useCallback(
		(pedal: number, kind: BindingKind, binding: KeyBinding | null) => {
			invoke("set_binding", { pedal, kind, binding })
				.then(() => {
					setBindings((prev) =>
						prev.map((b, i) => (i === pedal ? { ...b, [kind]: binding } : b)),
					);
				})
				.catch(() => {});
		},
		[],
	);

	const clearBinding = useCallback(
		(pedal: number, kind: BindingKind) => {
			setBinding(pedal, kind, null);
		},
		[setBinding],
	);

	const setThreshold = useCallback((ms: number) => {
		invoke("set_threshold", { ms })
			.then(() => {
				setThresholdMs(ms);
			})
			.catch(() => {});
	}, []);

	const setHoldPress = useCallback((pedal: number, press: boolean) => {
		// Optimistically update the UI, then persist. Keeping the checkbox in
		// sync with local state (rather than waiting for the invoke to resolve)
		// prevents it from visually resetting if the backend call is slow or
		// the pedal fires a re-render in the meantime.
		setBindings((prev) =>
			prev.map((b, i) => (i === pedal ? { ...b, holdPress: press } : b)),
		);
		invoke("set_hold_press", { pedal, press }).catch(() => {});
	}, []);

	return {
		bindings,
		setBinding,
		clearBinding,
		setHoldPress,
		thresholdMs,
		setThreshold,
	};
}
