import "./App.css";
import { Header } from "@/components/header";
import { Pedal } from "@/components/pedal";
import { ThemeProvider } from "@/components/theme-provider";
import { Titlebar } from "@/components/titlebar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { type BindingKind, useBindings } from "@/src/hooks/use-bindings";
import { useDeviceConnection } from "@/src/hooks/use-device-connection";
import { useRecording } from "@/src/hooks/use-recording";

const PEDAL_LABELS = ["Left", "Middle", "Right"];

function App() {
	const { connected, pressed, held } = useDeviceConnection();
	const { bindings, setBinding, clearBinding, thresholdMs, setThreshold } =
		useBindings();
	const { recording, toggleRecording } = useRecording({ setBinding });

	function handleClear(index: number, kind: BindingKind) {
		clearBinding(index, kind);
	}

	function handleToggleRecording(index: number, kind: BindingKind) {
		toggleRecording(index, kind);
	}

	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<div className="flex min-h-screen flex-col bg-background">
				<Titlebar connected={connected} />
				<Separator />
				<Header connected={connected} />
				<div className="px-6 pt-2">
					<Field orientation="horizontal">
						<FieldLabel className="whitespace-nowrap">
							Hold threshold
						</FieldLabel>
						<Slider
							value={[thresholdMs]}
							onValueChange={(v) => setThreshold(Array.isArray(v) ? v[0] : v)}
							min={100}
							max={2000}
							step={50}
							className="w-40"
						/>
						<span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
							{thresholdMs} ms
						</span>
					</Field>
				</div>
				<main className="flex flex-1 items-center justify-center px-6 pb-6 w-full gap-3">
					{PEDAL_LABELS.map((label, index) => (
						<Pedal
							key={label}
							label={label}
							position={
								index === 0
									? "left"
									: index === PEDAL_LABELS.length - 1
										? "right"
										: "middle"
							}
							binding={bindings[index]}
							pressed={pressed[index]}
							held={held[index]}
							recordingKind={recording?.pedal === index ? recording.kind : null}
							onClear={(kind) => handleClear(index, kind)}
							onToggleRecording={(kind) => handleToggleRecording(index, kind)}
						/>
					))}
				</main>
			</div>
		</ThemeProvider>
	);
}

export default App;
