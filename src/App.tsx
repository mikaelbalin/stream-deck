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
import "./App.css";

interface DeviceInfo {
	kind: string;
	serial: string;
	firmware: string | null;
}

const PEDAL_LABELS = ["Left", "Middle", "Right"];

function App() {
	const [connected, setConnected] = useState<DeviceInfo | null>(null);
	const [pressed, setPressed] = useState<boolean[]>([false, false, false]);
	const [testResult, setTestResult] = useState<string | null>(null);

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

	async function testEmulation() {
		try {
			await invoke("set_binding", {
				pedal: 0,
				binding: {
					ctrl: false,
					shift: false,
					alt: false,
					meta: false,
					code: "F13",
				},
			});
			setTestResult("Pedal 0 = F13. Press the left pedal to test.");
		} catch (e) {
			setTestResult(`Error: ${String(e)}`);
		}
	}

	return (
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

					<div className="grid grid-cols-3 gap-2">
						{PEDAL_LABELS.map((label, index) => (
							<div
								key={label}
								className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
									pressed[index]
										? "border-primary bg-primary/10"
										: "border-border"
								}`}
							>
								<span className="text-xs text-muted-foreground">{label}</span>
								<span
									className={`h-3 w-3 rounded-full ${
										pressed[index] ? "bg-primary" : "bg-muted"
									}`}
								/>
							</div>
						))}
					</div>

					<Button variant="outline" onClick={testEmulation}>
						Test emulation (set pedal 0 = F13)
					</Button>
					{testResult && (
						<div className="text-sm text-muted-foreground">{testResult}</div>
					)}
				</CardContent>
			</Card>
		</main>
	);
}

export default App;
