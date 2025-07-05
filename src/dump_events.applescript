on run argv
	-- Take the current date from Node and add 7 days
	if (count of argv) = 0 then
		return "Error: Please provide the current date"
	end if
	
	set startDateStr to item 1 of argv
	set startDate to date startDateStr
	set endDate to startDate + (7 * days)
	
	set output to ""
	set debugInfo to "Date range: " & (startDate as string) & " to " & (endDate as string) & linefeed
	
	tell application "Calendar"
		set theCals to calendars
		set totalEvents to 0
		
		repeat with cal in theCals
			set calName to name of cal
			-- Get events for the next 7 days only
			set theEvents to every event of cal whose start date ≥ startDate and start date < endDate
			
			repeat with e in theEvents
				try
					set eventSummary to summary of e
					set eventStart to start date of e
					set eventEnd to end date of e
					
					-- Format dates as ISO strings
					set startISO to my formatDateAsISO(eventStart)
					set endISO to my formatDateAsISO(eventEnd)
					
					set output to output & calName & "||" & eventSummary & "||" & startISO & "||" & endISO & linefeed
					set totalEvents to totalEvents + 1
				on error errMsg
					-- Skip problematic events
				end try
			end repeat
		end repeat
	end tell
	
	-- Add the events marker for easier parsing
	set finalOutput to debugInfo & "=== EVENTS ===" & linefeed & output
	
	if totalEvents = 0 then
		return finalOutput & "No events found in the next 7 days."
	else
		return finalOutput
	end if
end run

-- Helper function to format date as ISO string
on formatDateAsISO(theDate)
	set y to year of theDate
	set m to (month of theDate as integer)
	set d to day of theDate
	set h to hours of theDate
	set min to minutes of theDate
	set s to seconds of theDate
	
	-- Pad with zeros
	if m < 10 then set m to "0" & m
	if d < 10 then set d to "0" & d
	if h < 10 then set h to "0" & h
	if min < 10 then set min to "0" & min
	if s < 10 then set s to "0" & s
	
	return (y as string) & "-" & m & "-" & d & "T" & h & ":" & min & ":" & s
end formatDateAsISO