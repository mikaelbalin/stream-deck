import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { KeyBinding, PedalBinding } from "@/src/utils/key-binding";

export type BindingKind = "tap" | "hold";

export function useBindings() {
	const [bindings, setBindings] = useState<PedalBinding[]>([
		{ tap: null, hold: null },
		{ tap: null, hold: null },
		{ tap: null, hold: null },
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

	return { bindings, setBinding, clearBinding, thresholdMs, setThreshold };
}
