import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { DeviceInfo } from "@/components/header";

export function useDeviceConnection() {
	const [connected, setConnected] = useState<DeviceInfo | null>(null);
	const [pressed, setPressed] = useState<boolean[]>([false, false, false]);

	useEffect(() => {
		let disposed = false;
		const unlisteners: Promise<() => void>[] = [];

		unlisteners.push(
			listen<DeviceInfo>("pedal-connected", (event) => {
				if (disposed) return;
				setConnected(event.payload);
				setPressed([false, false, false]);
			}),
		);

		unlisteners.push(
			listen("pedal-disconnected", () => {
				if (disposed) return;
				setConnected(null);
				setPressed([false, false, false]);
			}),
		);

		unlisteners.push(
			listen<number>("pedal-button-down", (event) => {
				if (disposed) return;
				setPressed((prev) =>
					prev.map((value, index) => (index === event.payload ? true : value)),
				);
			}),
		);

		unlisteners.push(
			listen<number>("pedal-button-up", (event) => {
				if (disposed) return;
				setPressed((prev) =>
					prev.map((value, index) => (index === event.payload ? false : value)),
				);
			}),
		);

		// Fetch the current state in case the device was already connected
		// before the listeners above were registered.
		invoke<DeviceInfo | null>("get_device_info")
			.then((info) => {
				if (!disposed) setConnected(info);
			})
			.catch(() => {});

		return () => {
			disposed = true;
			unlisteners.forEach((unlisten) => {
				unlisten.then((f) => f());
			});
		};
	}, []);

	return { connected, pressed };
}
