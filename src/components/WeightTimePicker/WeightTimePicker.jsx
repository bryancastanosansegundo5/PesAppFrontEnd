import {
  TimePickerRoot,
  TimePickerSeparator,
  TimePickerWheel,
  TimePickerWheels,
} from '@poursha98/react-ios-time-picker'

const estilosWheel = {
  root: 'rounded-[22px] border border-neon-cyan/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,243,255,0.92))] shadow-[0_12px_32px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(8,13,24,0.98),rgba(4,7,16,0.96))]',
  item: 'text-base font-bold text-slate-400 transition-colors duration-200 data-[selected=true]:text-slate-950 dark:text-slate-600 dark:data-[selected=true]:text-white',
  selectedItem: 'text-neon-cyan dark:text-neon-cyan',
  overlayTop: 'from-white via-white/90 to-transparent dark:from-[#08111f] dark:via-[#08111f]/92',
  overlayBottom: 'from-[#f5f3ff] via-white/92 to-transparent dark:from-[#030407] dark:via-[#08111f]/92',
  indicator:
    'mx-1 rounded-2xl border border-neon-pink/25 bg-[linear-gradient(90deg,rgba(0,255,237,0.1),rgba(255,102,255,0.08))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] dark:border-neon-cyan/15 dark:bg-[linear-gradient(90deg,rgba(0,255,237,0.12),rgba(105,0,255,0.12))]',
  viewport: '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
}

function WeightTimePicker({ value, onChange, onTouch, className = '' }) {
  return (
    <TimePickerRoot
      value={value}
      onChange={(siguienteHora) => {
        onTouch?.()
        onChange(siguienteHora)
      }}
      className={`w-full rounded-[24px] border border-neon-cyan/20 bg-white/70 p-2 shadow-[0_16px_38px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:bg-white/[0.03] ${className}`}
      itemHeight={40}
      visibleCount={3}
      loop
    >
      <TimePickerWheels
        hideIndicator
        className="gap-1.5"
      >
        <TimePickerWheel
          type="hour"
          className="min-w-[84px] max-w-[92px] flex-none"
          classNames={estilosWheel}
        />
        <TimePickerSeparator className="px-0 text-[1.7rem] font-black text-neon-pink dark:text-neon-cyan">
          :
        </TimePickerSeparator>
        <TimePickerWheel
          type="minute"
          className="min-w-[84px] max-w-[92px] flex-none"
          classNames={estilosWheel}
        />
      </TimePickerWheels>
    </TimePickerRoot>
  )
}

export default WeightTimePicker
