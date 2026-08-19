import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { DeviceInfo } from "@/components/header";
import { ModeToggle } from "@/components/mode-toggle";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarShortcut,
	MenubarTrigger,
} from "@/components/ui/menubar";

const appWindow = isTauri() ? getCurrentWindow() : null;

interface TitlebarProps {
	connected: DeviceInfo | null;
}

export function Titlebar({ connected }: TitlebarProps) {
	const [maximized, setMaximized] = useState(false);
	const [aboutOpen, setAboutOpen] = useState(false);

	useEffect(() => {
		if (!appWindow) return;

		let disposed = false;

		appWindow.isMaximized().then((value) => {
			if (!disposed) setMaximized(value);
		});

		const unlisten = appWindow.onResized(async () => {
			const value = await appWindow.isMaximized();
			if (!disposed) setMaximized(value);
		});

		return () => {
			disposed = true;
			unlisten.then((fn) => fn());
		};
	}, []);

	async function toggleFullscreen() {
		if (!appWindow) return;
		const isFullscreen = await appWindow.isFullscreen();
		await appWindow.setFullscreen(!isFullscreen);
	}

	return (
		<>
			<div className="flex h-9 items-center border-b bg-background select-none">
				<Menubar className="h-full border-0 bg-transparent p-0">
					<MenubarMenu>
						<MenubarTrigger>File</MenubarTrigger>
						<MenubarContent>
							<MenubarItem onClick={() => appWindow?.close()}>
								Quit
								<MenubarShortcut>Ctrl+Q</MenubarShortcut>
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					<MenubarMenu>
						<MenubarTrigger>View</MenubarTrigger>
						<MenubarContent>
							<MenubarItem onClick={() => window.location.reload()}>
								Reload
								<MenubarShortcut>Ctrl+R</MenubarShortcut>
							</MenubarItem>
							<MenubarSeparator />
							<MenubarItem onClick={toggleFullscreen}>
								Toggle Fullscreen
								<MenubarShortcut>F11</MenubarShortcut>
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					<MenubarMenu>
						<MenubarTrigger>Help</MenubarTrigger>
						<MenubarContent>
							<MenubarItem onClick={() => setAboutOpen(true)}>
								About
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>
				</Menubar>

				<div data-tauri-drag-region className="flex-1 self-stretch" />

				<div className="flex h-full items-center">
					<div className="mr-1 flex items-center">
						<ModeToggle />
					</div>

					<button
						type="button"
						onClick={() => appWindow?.minimize()}
						className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						aria-label="Minimize"
					>
						<Minus className="size-4" />
					</button>

					<button
						type="button"
						onClick={() => appWindow?.toggleMaximize()}
						className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						aria-label={maximized ? "Restore" : "Maximize"}
					>
						{maximized ? (
							<Copy className="size-4" />
						) : (
							<Square className="size-4" />
						)}
					</button>

					<button
						type="button"
						onClick={() => appWindow?.close()}
						className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
						aria-label="Close"
					>
						<X className="size-4" />
					</button>
				</div>
			</div>

			<Dialog open={aboutOpen} onOpenChange={(open) => setAboutOpen(open)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Stream Deck Pedal</DialogTitle>
						<DialogDescription>Foot pedal controller</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-1 text-sm">
						{connected ? (
							<>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Serial</span>
									<span className="font-medium">{connected.serial}</span>
								</div>
								{connected.firmware && (
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Firmware</span>
										<span className="font-medium">{connected.firmware}</span>
									</div>
								)}
							</>
						) : (
							<span className="text-muted-foreground">No device connected</span>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
