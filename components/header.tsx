export interface DeviceInfo {
	kind: string;
	serial: string;
	firmware: string | null;
}

interface HeaderProps {
	connected: DeviceInfo | null;
}

export function Header({ connected }: HeaderProps) {
	return (
		<header className="flex items-center justify-between border-b px-6 py-4">
			<h1 className="font-heading text-xl font-medium">Stream Deck Pedal</h1>

			<div className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm">
				<span
					className={`h-2.5 w-2.5 rounded-full ${
						connected
							? "bg-emerald-500 shadow-[0_0_8px_2px_var(--color-emerald-500)]"
							: "bg-red-500"
					}`}
				/>
				<span className="font-medium">
					{connected ? "Connected" : "Disconnected"}
				</span>
			</div>
		</header>
	);
}
