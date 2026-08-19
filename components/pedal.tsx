import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export interface KeyBinding {
	ctrl: boolean;
	shift: boolean;
	alt: boolean;
	meta: boolean;
	code: string;
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

interface PedalProps {
	label: string;
	binding: KeyBinding | null;
	pressed: boolean;
	isRecording: boolean;
	onClear: () => void;
	onToggleRecording: () => void;
}

export function Pedal({
	label,
	binding,
	pressed,
	isRecording,
	onClear,
	onToggleRecording,
}: PedalProps) {
	return (
		<div
			className={`rounded-xl border p-3 transition-colors ${
				pressed ? "border-primary bg-primary/10" : "border-border"
			}`}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span
						className={`h-3 w-3 rounded-full ${
							pressed ? "bg-primary" : "bg-muted"
						}`}
					/>
					<span className="text-sm font-medium">{label}</span>
				</div>
				{binding && (
					<Button variant="ghost" size="xs" onClick={onClear}>
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
					<span className="text-sm text-muted-foreground">Not set</span>
				)}
			</div>

			<Button
				variant={isRecording ? "secondary" : "outline"}
				size="sm"
				className="mt-2 w-full"
				onClick={onToggleRecording}
			>
				{isRecording ? "Cancel" : "Record"}
			</Button>
		</div>
	);
}
