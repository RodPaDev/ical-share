import EventKit
import Foundation

// MARK: - Event Data Structure
struct CalendarEvent: Codable {
    let calendar: String
    let title: String
    let startDate: String
    let endDate: String
    let isAllDay: Bool
    let location: String?
    let notes: String?
}

struct CalendarExportResult: Codable {
    let dateRange: DateRange
    let events: [CalendarEvent]
    let totalCount: Int
    
    struct DateRange: Codable {
        let start: String
        let end: String
    }
}
extension Date {
    func formatForOutput() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        formatter.timeZone = TimeZone.current
        return formatter.string(from: self)
    }
    
    static func fromAppleScriptFormat(_ dateStr: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "M/d/yyyy HH:mm:ss"
        return formatter.date(from: dateStr)
    }
}

// MARK: - Standard Error Extension
extension FileHandle: TextOutputStream {
    public func write(_ string: String) {
        guard let data = string.data(using: .utf8) else { return }
        self.write(data)
    }
}

var standardError = FileHandle.standardError

// MARK: - Main Calendar Export Class
class CalendarExporter {
    private let eventStore = EKEventStore()
    private var hasAccess = false
    
    func requestAccess() -> Bool {
        let semaphore = DispatchSemaphore(value: 0)
        var accessGranted = false
        
        if #available(macOS 14.0, *) {
            eventStore.requestFullAccessToEvents { granted, error in
                if let error = error {
                    print("Error requesting calendar access: \(error.localizedDescription)", to: &standardError)
                }
                accessGranted = granted
                self.hasAccess = granted
                semaphore.signal()
            }
        } else {
            eventStore.requestAccess(to: .event) { granted, error in
                if let error = error {
                    print("Error requesting calendar access: \(error.localizedDescription)", to: &standardError)
                }
                accessGranted = granted
                self.hasAccess = granted
                semaphore.signal()
            }
        }
        
        semaphore.wait()
        return accessGranted
    }
    
    func exportEvents(startDate: Date, endDate: Date) -> String {
        guard hasAccess else {
            let errorResult = CalendarExportResult(
                dateRange: CalendarExportResult.DateRange(
                    start: startDate.formatForOutput(),
                    end: endDate.formatForOutput()
                ),
                events: [],
                totalCount: 0
            )
            
            do {
                let jsonData = try JSONEncoder().encode(errorResult)
                return String(data: jsonData, encoding: .utf8) ?? "Error: Calendar access not granted"
            } catch {
                return "Error: Calendar access not granted"
            }
        }
        
        let predicate = eventStore.predicateForEvents(
            withStart: startDate,
            end: endDate,
            calendars: nil
        )
        
        let events = eventStore.events(matching: predicate)
        
        // Sort events by start date
        let sortedEvents = events.sorted { $0.startDate < $1.startDate }
        
        let calendarEvents = sortedEvents.map { event in
            CalendarEvent(
                calendar: event.calendar?.title ?? "Unknown Calendar",
                title: event.title ?? "Untitled Event",
                startDate: event.startDate.formatForOutput(),
                endDate: event.endDate.formatForOutput(),
                isAllDay: event.isAllDay,
                location: event.location,
                notes: event.notes
            )
        }
        
        let result = CalendarExportResult(
            dateRange: CalendarExportResult.DateRange(
                start: startDate.formatForOutput(),
                end: endDate.formatForOutput()
            ),
            events: calendarEvents,
            totalCount: calendarEvents.count
        )
        
        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            let jsonData = try encoder.encode(result)
            return String(data: jsonData, encoding: .utf8) ?? "Error encoding JSON"
        } catch {
            print("Error encoding JSON: \(error.localizedDescription)", to: &standardError)
            return "Error encoding JSON: \(error.localizedDescription)"
        }
    }
}

// MARK: - Command Line Interface
func parseArguments() -> (startDate: Date, endDate: Date)? {
    let args = CommandLine.arguments
    
    guard args.count >= 2 else {
        print("Error: Please provide the start date", to: &standardError)
        return nil
    }
    
    let startDateStr = args[1]
    guard let startDate = Date.fromAppleScriptFormat(startDateStr) else {
        print("Error: Invalid date format. Expected M/d/yyyy HH:mm:ss", to: &standardError)
        return nil
    }
    
    // Default to 7 days from start date if no end date provided
    let endDate: Date
    if args.count >= 3 {
        guard let parsedEndDate = Date.fromAppleScriptFormat(args[2]) else {
            print("Error: Invalid end date format. Expected M/d/yyyy HH:mm:ss", to: &standardError)
            return nil
        }
        endDate = parsedEndDate
    } else {
        endDate = Calendar.current.date(byAdding: .day, value: 7, to: startDate) ?? startDate
    }
    
    return (startDate: startDate, endDate: endDate)
}

// MARK: - Main Execution
func main() {
    guard let (startDate, endDate) = parseArguments() else {
        exit(1)
    }
    
    let exporter = CalendarExporter()
    
    let accessGranted = exporter.requestAccess()
    if !accessGranted {
        print("Error: Calendar access denied. Please grant access in System Preferences > Security & Privacy > Privacy > Calendars", to: &standardError)
        exit(1)
    }
    
    let result = exporter.exportEvents(startDate: startDate, endDate: endDate)
    print(result)
}

main()