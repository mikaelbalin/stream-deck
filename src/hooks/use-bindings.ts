import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { KeyBinding } from "@/src/utils/key-binding";

export function useBindings() {
	const [bindings, setBindings] = useState<(KeyBinding | null)[]>([
		null,
		null,
		null,
	]);

	useEffect(() => {
		let disposed = false;

		invoke<(KeyBinding | null)[]>("get_bindings")
			.then((b) => {
				if (!disposed) setBindings(b);
			})
			.catch(() => {});

		return () => {
			disposed = true;
		};
	}, []);

	const setBinding = useCallback(
		(pedal: number, binding: KeyBinding | null) => {
			invoke("set_binding", { pedal, binding })
				.then(() => {
					setBindings((prev) =>
						prev.map((b, i) => (i === pedal ? binding : b)),
					);
				})
				.catch(() => {});
		},
		[],
	);

	const clearBinding = useCallback(
		(pedal: number) => {
			setBinding(pedal, null);
		},
		[setBinding],
	);

	return { bindings, setBinding, clearBinding };
}
