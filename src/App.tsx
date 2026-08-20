import "./App.css";
import { Header } from "@/components/header";
import { Pedal } from "@/components/pedal";
import { ThemeProvider } from "@/components/theme-provider";
import { Titlebar } from "@/components/titlebar";
import { Separator } from "@/components/ui/separator";
import { useBindings } from "@/src/hooks/use-bindings";
import { useDeviceConnection } from "@/src/hooks/use-device-connection";
import { useRecording } from "@/src/hooks/use-recording";

const PEDAL_LABELS = ["Left", "Middle", "Right"];

function App() {
	const { connected, pressed } = useDeviceConnection();
	const { bindings, setBinding, clearBinding } = useBindings();
	const { recordingPedal, toggleRecording } = useRecording({ setBinding });

	function handleClear(index: number) {
		clearBinding(index);
	}

	function handleToggleRecording(index: number) {
		toggleRecording(index);
	}

	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<div className="flex min-h-screen flex-col bg-background">
				<Titlebar connected={connected} />
				<Separator />
				<Header connected={connected} />
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
							isRecording={recordingPedal === index}
							onClear={() => handleClear(index)}
							onToggleRecording={() => handleToggleRecording(index)}
						/>
					))}
				</main>
			</div>
		</ThemeProvider>
	);
}

export default App;
