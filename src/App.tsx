import "./App.css";
import { Header } from "@/components/header";
import { Pedal } from "@/components/pedal";
import { ThemeProvider } from "@/components/theme-provider";
import { Titlebar } from "@/components/titlebar";
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
			<div className="flex min-h-screen flex-col bg-background overflow-hidden rounded-2xl">
				<Titlebar connected={connected} />
				<Header connected={connected} />
				<main className="flex flex-1 items-center justify-center p-6">
					<div className="flex w-full max-w-md flex-col gap-4 md:max-w-6xl">
						<div className="flex flex-col gap-3 md:flex-row">
							{PEDAL_LABELS.map((label, index) => (
								<Pedal
									key={label}
									label={label}
									binding={bindings[index]}
									pressed={pressed[index]}
									isRecording={recordingPedal === index}
									onClear={() => handleClear(index)}
									onToggleRecording={() => handleToggleRecording(index)}
								/>
							))}
						</div>
					</div>
				</main>
			</div>
		</ThemeProvider>
	);
}

export default App;
