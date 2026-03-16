import { describe, it, expect } from 'vitest'
import { cn } from '../lib/utils'

describe('utils', () => {
  describe('cn (className utility)', () => {
    it('should combine class names correctly', () => {
      const result = cn('btn', 'btn-primary')
      expect(result).toContain('btn')
      expect(result).toContain('btn-primary')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('btn', isActive && 'active')
      expect(result).toContain('btn')
      expect(result).toContain('active')
    })

    it('should handle false conditions', () => {
      const isActive = false
      const result = cn('btn', isActive && 'active')
      expect(result).toContain('btn')
      expect(result).not.toContain('active')
    })

    it('should merge conflicting Tailwind classes', () => {
      const result = cn('p-4', 'p-6')
      // twMerge should keep only the last padding class
      expect(result).not.toContain('p-4')
      expect(result).toContain('p-6')
    })

    it('should handle empty inputs', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle array inputs', () => {
      const result = cn(['btn', 'btn-primary'])
      expect(result).toContain('btn')
      expect(result).toContain('btn-primary')
    })

    it('should handle object inputs', () => {
      const result = cn({
        'btn': true,
        'btn-primary': true,
        'disabled': false
      })
      expect(result).toContain('btn')
      expect(result).toContain('btn-primary')
      expect(result).not.toContain('disabled')
    })
  })
})