import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
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
			</CardHeader>

			<CardContent>
				<InputGroup>
					{isRecording ? (
						<InputGroupInput
							placeholder="Press a key… (Esc to cancel)"
							readOnly
						/>
					) : binding ? (
						<InputGroupAddon align="inline-start">
							{bindingParts(binding).map((part) => (
								<Kbd key={part}>{part}</Kbd>
							))}
						</InputGroupAddon>
					) : (
						<InputGroupAddon align="inline-start">
							<InputGroupText>Not set</InputGroupText>
						</InputGroupAddon>
					)}

					<InputGroupAddon align="inline-end">
						{binding && !isRecording && (
							<InputGroupButton onClick={onClear}>Clear</InputGroupButton>
						)}
						<InputGroupButton
							variant={isRecording ? "secondary" : "outline"}
							onClick={onToggleRecording}
						>
							{isRecording ? "Cancel" : "Record"}
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</CardContent>
		</Card>
	);
}
