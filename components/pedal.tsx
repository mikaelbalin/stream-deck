import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { bindingParts, type KeyBinding } from "@/src/utils/key-binding";

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
		<Card
			size="default"
			className={cn("ring-primary bg-primary/10 grow", {
				"ring-primary": pressed,
			})}
		>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span
						className={`h-3 w-3 rounded-full ${
							pressed ? "bg-primary" : "bg-muted"
						}`}
					/>
					{label}
				</CardTitle>
				{binding && (
					<CardAction>
						<Button variant="ghost" size="xs" onClick={onClear}>
							Clear
						</Button>
					</CardAction>
				)}
			</CardHeader>

			<CardContent className="flex flex-col gap-2">
				<div className="min-h-5">
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
					className="w-full"
					onClick={onToggleRecording}
				>
					{isRecording ? "Cancel" : "Record"}
				</Button>
			</CardContent>
		</Card>
	);
}
