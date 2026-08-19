import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import "./App.css";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";

interface DeviceInfo {
	kind: string;
	serial: string;
	firmware: string | null;
}

interface KeyBinding {
	ctrl: boolean;
	shift: boolean;
	alt: boolean;
	meta: boolean;
	code: string;
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

function formatCode(code: string): string {
	if (code.startsWith("Key")) return code.slice(3);
	if (code.startsWith("Digit")) return code.slice(5);
	const map: Record<string, string> = {
		Space: "Space",
		Enter: "Enter",
		Tab: "Tab",
		Escape: "Esc",
		Backspace: "Backspace",
		Delete: "Del",
		Insert: "Ins",
		Home: "Home",
		End: "End",
		PageUp: "PgUp",
		PageDown: "PgDn",
		ArrowUp: "↑",
		ArrowDown: "↓",
		ArrowLeft: "←",
		ArrowRight: "→",
		MediaPlayPause: "Play/Pause",
		MediaTrackNext: "Next",
		MediaTrackPrevious: "Prev",
		MediaStop: "Stop",
		AudioVolumeUp: "Vol+",
		AudioVolumeDown: "Vol−",
		AudioVolumeMute: "Mute",
		Minus: "-",
		Equal: "=",
		BracketLeft: "[",
		BracketRight: "]",
		Semicolon: ";",
		Quote: "'",
		Backquote: "`",
		Backslash: "\\",
		Comma: ",",
		Period: ".",
		Slash: "/",
	};
	return map[code] ?? code;
}

function bindingParts(binding: KeyBinding): string[] {
	const parts: string[] = [];
	if (binding.ctrl) parts.push("Ctrl");
	if (binding.shift) parts.push("Shift");
	if (binding.alt) parts.push("Alt");
	if (binding.meta) parts.push("Super");
	parts.push(formatCode(binding.code));
	return parts;
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
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Stream Deck Pedal</CardTitle>
						<CardDescription>Foot pedal controller</CardDescription>
						<CardAction>
							{connected ? (
								<Badge variant="secondary">Connected</Badge>
							) : (
								<Badge variant="outline">Disconnected</Badge>
							)}
						</CardAction>
					</CardHeader>

					<CardContent className="flex flex-col gap-4">
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

						<div className="flex flex-col gap-3">
							{PEDAL_LABELS.map((label, index) => {
								const binding = bindings[index];
								const isRecording = recordingPedal === index;
								return (
									<div
										key={label}
										className={`rounded-xl border p-3 transition-colors ${
											pressed[index]
												? "border-primary bg-primary/10"
												: "border-border"
										}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<span
													className={`h-3 w-3 rounded-full ${
														pressed[index] ? "bg-primary" : "bg-muted"
													}`}
												/>
												<span className="text-sm font-medium">{label}</span>
											</div>
											{binding && (
												<Button
													variant="ghost"
													size="xs"
													onClick={() => clearBinding(index)}
												>
													Clear
												</Button>
											)}
										</div>

										<div className="mt-2 min-h-5">
											{isRecording ? (
												<span className="text-sm text-muted-foreground">
													Press a key… (Esc to cancel)
												</span>
											) : binding ? (
												<div className="flex flex-wrap items-center gap-1">
													{bindingParts(binding).map((part) => (
														<Kbd key={part}>{part}</Kbd>
													))}
												</div>
											) : (
												<span className="text-sm text-muted-foreground">
													Not set
												</span>
											)}
										</div>

										<Button
											variant={isRecording ? "secondary" : "outline"}
											size="sm"
											className="mt-2 w-full"
											onClick={() =>
												setRecordingPedal(isRecording ? null : index)
											}
										>
											{isRecording ? "Cancel" : "Record"}
										</Button>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			</main>
		</ThemeProvider>
	);
}

export default App;
