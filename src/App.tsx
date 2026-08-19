import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import "./App.css";
import { ModeToggle } from "@/components/mode-toggle";
import { type KeyBinding, Pedal } from "@/components/pedal";
import { ThemeProvider } from "@/components/theme-provider";

interface DeviceInfo {
	kind: string;
	serial: string;
	firmware: string | null;
}

const PEDAL_LABELS = ["Left", "Middle", "Right"];

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

function App() {
	const [connected, setConnected] = useState<DeviceInfo | null>(null);
	const [pressed, setPressed] = useState<boolean[]>([false, false, false]);
	const [bindings, setBindings] = useState<(KeyBinding | null)[]>([
		null,
		null,
		null,
	]);
	const [recordingPedal, setRecordingPedal] = useState<number | null>(null);

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

		invoke<(KeyBinding | null)[]>("get_bindings")
			.then((b) => {
				if (!disposed) setBindings(b);
			})
			.catch(() => {});

		return () => {
			disposed = true;
			unlisteners.forEach((unlisten) => {
				unlisten.then((f) => f());
			});
		};
	}, []);

	useEffect(() => {
		if (recordingPedal === null) return;

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

			const pedal = recordingPedal;
			const binding: KeyBinding = {
				ctrl: event.ctrlKey,
				shift: event.shiftKey,
				alt: event.altKey,
				meta: event.metaKey,
				code: event.code,
			};

			setRecordingPedal(null);

			invoke("set_binding", { pedal, binding })
				.then(() => {
					setBindings((prev) =>
						prev.map((b, i) => (i === pedal ? binding : b)),
					);
				})
				.catch(() => {});
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [recordingPedal]);

	function clearBinding(pedal: number) {
		invoke("set_binding", { pedal, binding: null })
			.then(() => {
				setBindings((prev) => prev.map((b, i) => (i === pedal ? null : b)));
			})
			.catch(() => {});
	}

	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<ModeToggle />
			<main className="flex min-h-screen items-center justify-center p-6">
				<div className="flex w-full max-w-md flex-col gap-4">
					<div className="flex items-start justify-between">
						<div>
							<h1 className="font-heading text-base font-medium">
								Stream Deck Pedal
							</h1>
							<p className="text-sm text-muted-foreground">
								Foot pedal controller
							</p>
						</div>
						{connected ? (
							<Badge variant="secondary">Connected</Badge>
						) : (
							<Badge variant="outline">Disconnected</Badge>
						)}
					</div>

					{connected ? (
						<div className="text-sm text-muted-foreground">
							Serial: {connected.serial}
							{connected.firmware ? ` · Firmware: ${connected.firmware}` : ""}
						</div>
					) : (
						<div className="text-sm text-muted-foreground">
							No Stream Deck Pedal connected.
						</div>
					)}

					<div className="flex flex-col md:flex-row gap-3">
						{PEDAL_LABELS.map((label, index) => (
							<Pedal
								key={label}
								label={label}
								binding={bindings[index]}
								pressed={pressed[index]}
								isRecording={recordingPedal === index}
								onClear={() => clearBinding(index)}
								onToggleRecording={() =>
									setRecordingPedal(recordingPedal === index ? null : index)
								}
							/>
						))}
					</div>
				</div>
			</main>
		</ThemeProvider>
	);
}

export default App;
