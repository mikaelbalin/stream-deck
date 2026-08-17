import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
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
	const [devices, setDevices] = useState<DeviceInfo[]>([]);
	const [connected, setConnected] = useState<DeviceInfo | null>(null);
	const [pressed, setPressed] = useState<boolean[]>([false, false, false]);
	const [error, setError] = useState<string | null>(null);

	const refreshDevices = useCallback(async () => {
		try {
			setDevices(await invoke<DeviceInfo[]>("list_devices"));
			setError(null);
		} catch (e) {
			setError(String(e));
		}
	}, []);

	useEffect(() => {
		refreshDevices();

		const unlisteners: Promise<() => void>[] = [];

		unlisteners.push(
			listen<number>("pedal-button-down", (event) => {
				setPressed((prev) =>
					prev.map((value, index) => (index === event.payload ? true : value)),
				);
			}),
		);

		unlisteners.push(
			listen<number>("pedal-button-up", (event) => {
				setPressed((prev) =>
					prev.map((value, index) => (index === event.payload ? false : value)),
				);
			}),
		);

		unlisteners.push(
			listen("pedal-disconnected", () => {
				setConnected(null);
				setPressed([false, false, false]);
			}),
		);

		return () => {
			unlisteners.forEach((unlisten) => {
				unlisten.then((f) => f());
			});
		};
	}, [refreshDevices]);

	async function connect(serial: string) {
		try {
			setConnected(await invoke<DeviceInfo>("connect", { serial }));
			setError(null);
		} catch (e) {
			setError(String(e));
		}
	}

	async function disconnect() {
		try {
			await invoke("disconnect");
			setConnected(null);
			setPressed([false, false, false]);
			setError(null);
		} catch (e) {
			setError(String(e));
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
						<>
							<div className="text-sm text-muted-foreground">
								Serial: {connected.serial}
								{connected.firmware ? ` · Firmware: ${connected.firmware}` : ""}
							</div>
							<Button variant="outline" onClick={disconnect}>
								Disconnect
							</Button>
						</>
					) : (
						<>
							{devices.length === 0 ? (
								<div className="text-sm text-muted-foreground">
									No Stream Deck Pedal found.
								</div>
							) : (
								<div className="flex flex-col gap-2">
									{devices.map((device) => (
										<Button
											key={device.serial}
											onClick={() => connect(device.serial)}
										>
											Connect {device.serial}
										</Button>
									))}
								</div>
							)}
							<Button variant="ghost" onClick={refreshDevices}>
								Refresh
							</Button>
						</>
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

					{error && <div className="text-sm text-destructive">{error}</div>}
				</CardContent>
			</Card>
		</main>
	);
}

export default App;
