import { useState } from 'react'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface ValidationRules {
  [key: string]: ValidationRule
}

export interface ValidationErrors {
  [key: string]: string
}

export class FormValidator {
  static validateField(value: any, rules: ValidationRule): string | null {
    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return 'This field is required'
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null
    }

    // String validations
    if (typeof value === 'string') {
      // Min length validation
      if (rules.minLength && value.length < rules.minLength) {
        return `Must be at least ${rules.minLength} characters long`
      }

      // Max length validation
      if (rules.maxLength && value.length > rules.maxLength) {
        return `Must be no more than ${rules.maxLength} characters long`
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        return 'Invalid format'
      }
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value)
    }

    return null
  }

  static validateForm(data: any, rules: ValidationRules): ValidationErrors {
    const errors: ValidationErrors = {}

    for (const [field, fieldRules] of Object.entries(rules)) {
      const error = this.validateField(data[field], fieldRules)
      if (error) {
        errors[field] = error
      }
    }

    return errors
  }

  static hasErrors(errors: ValidationErrors): boolean {
    return Object.keys(errors).length > 0
  }
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  phoneStrict: /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphabetic: /^[a-zA-Z\s]+$/,
  numeric: /^\d+$/,
  decimal: /^\d+(\.\d+)?$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
}

// Common validation rules
export const CommonValidationRules = {
  email: {
    required: true,
    pattern: ValidationPatterns.email,
    custom: (value: string) => {
      if (value && value.length > 254) {
        return 'Email address is too long'
      }
      return null
    }
  },
  
  password: {
    required: true,
    minLength: 8,
    custom: (value: string) => {
      if (!ValidationPatterns.strongPassword.test(value)) {
        return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }
      return null
    }
  },

  phoneNumber: {
    required: true,
    pattern: ValidationPatterns.phone,
    custom: (value: string) => {
      // Remove all non-digit characters for length check
      const digitsOnly = value.replace(/\D/g, '')
      if (digitsOnly.length < 10) {
        return 'Phone number must have at least 10 digits'
      }
      if (digitsOnly.length > 15) {
        return 'Phone number is too long'
      }
      return null
    }
  },

  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: ValidationPatterns.alphabetic
  },

  companyName: {
    required: true,
    minLength: 2,
    maxLength: 100
  },

  campaignName: {
    required: true,
    minLength: 3,
    maxLength: 100
  },

  url: {
    pattern: ValidationPatterns.url,
    custom: (value: string) => {
      if (value) {
        try {
          new URL(value)
          return null
        } catch {
          return 'Please enter a valid URL'
        }
      }
      return null
    }
  }
}

// Form validation helpers
export const validateEmail = (email: string): string | null => {
  return FormValidator.validateField(email, CommonValidationRules.email)
}

export const validatePassword = (password: string): string | null => {
  return FormValidator.validateField(password, CommonValidationRules.password)
}

export const validatePhoneNumber = (phone: string): string | null => {
  return FormValidator.validateField(phone, CommonValidationRules.phoneNumber)
}

export const validatePasswordMatch = (password: string, confirmPassword: string): string | null => {
  if (password !== confirmPassword) {
    return 'Passwords do not match'
  }
  return null
}

// Real-time validation hook
export const useFormValidation = (initialData: any, rules: ValidationRules) => {
  const [data, setData] = useState(initialData)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<{[key: string]: boolean}>({})

  const validateField = (field: string, value: any) => {
    const error = FormValidator.validateField(value, rules[field] || {})
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }))
    return error
  }

  const handleChange = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
    if (touched[field]) {
      validateField(field, value)
    }
  }

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field, data[field])
  }

  const validateAll = () => {
    const allErrors = FormValidator.validateForm(data, rules)
    setErrors(allErrors)
    setTouched(Object.keys(rules).reduce((acc, key) => ({ ...acc, [key]: true }), {}))
    return !FormValidator.hasErrors(allErrors)
  }

  return {
    data,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    hasErrors: FormValidator.hasErrors(errors),
    setData,
    setErrors
  }
}