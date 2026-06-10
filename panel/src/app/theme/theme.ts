import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

const theme = definePreset(Aura, {
  semantic: {
    primary: {
      50: 'var(--color-primary-50)',
      100: 'var(--color-primary-100)',
      200: 'var(--color-primary-200)',
      300: 'var(--color-primary-300)',
      400: 'var(--color-primary-400)',
      500: 'var(--color-primary-500)',
      600: 'var(--color-primary-600)',
      700: 'var(--color-primary-700)',
      800: 'var(--color-primary-800)',
      900: 'var(--color-primary-900)',
      950: 'var(--color-primary-950)'
    },
    orange: {
      500: 'var(--color-warning-500)'
    },
    green: {
      500: 'var(--color-success-500)'
    },
    colorScheme: {
      light: {
        surface: {
          0: 'var(--color-surface-0)',
          50: 'var(--color-surface-50)',
          100: 'var(--color-surface-100)',
          200: 'var(--color-surface-200)',
          300: 'var(--color-surface-300)',
          400: 'var(--color-surface-400)',
          500: 'var(--color-surface-500)',
          600: 'var(--color-surface-600)',
          700: 'var(--color-surface-700)',
          800: 'var(--color-surface-800)',
          900: 'var(--color-surface-900)',
          950: 'var(--color-surface-950)'
        },
        form: {
          field: {
            background: 'var(--color-surface-0)',
            disabledBackground: 'var(--color-surface-200)',
            filledBackground: 'var(--color-surface-50)',
            filledFocusBackground: 'var(--color-surface-0)',
            borderColor: 'var(--color-primary-300)',
            hoverBorderColor: 'var(--color-primary-500)',
            focusBorderColor: 'var(--color-primary-500)',
            invalidBorderColor: 'var(--color-danger-500)',
            color: 'var(--color-content)',
            disabledColor: 'var(--color-surface-500)',
            placeholderColor: 'var(--color-surface-500)',
            floatLabelColor: 'var(--color-primary-500)',
            floatLabelFocusColor: 'var(--color-primary-500)',
            floatLabelActiveColor: 'var(--color-surface-500)',
            iconColor: 'var(--color-surface-500)'
          }
        }
      },

      dark: {
        surface: {
          0: 'var(--color-surface-0)',
          50: 'var(--color-surface-50)',
          100: 'var(--color-surface-100)',
          200: 'var(--color-surface-200)',
          300: 'var(--color-surface-300)',
          400: 'var(--color-surface-400)',
          500: 'var(--color-surface-500)',
          600: 'var(--color-surface-600)',
          700: 'var(--color-surface-700)',
          800: 'var(--color-surface-800)',
          900: 'var(--color-surface-900)',
          950: 'var(--color-surface-950)'
        },
        form: {
          field: {
            background: 'var(--color-surface-50)',
            disabledBackground: 'var(--color-surface-200)',
            filledBackground: 'var(--color-surface-100)',
            filledFocusBackground: 'var(--color-surface-50)',
            borderColor: 'var(--color-surface-400)',
            hoverBorderColor: 'var(--color-primary-400)',
            focusBorderColor: 'var(--color-primary-400)',
            invalidBorderColor: 'var(--color-danger-500)',
            color: 'var(--color-content)',
            disabledColor: 'var(--color-surface-500)',
            placeholderColor: 'var(--color-surface-400)',
            floatLabelColor: 'var(--color-surface-400)',
            floatLabelFocusColor: 'var(--color-primary-400)',
            floatLabelActiveColor: 'var(--color-surface-400)',
            iconColor: 'var(--color-surface-400)'
          }
        }
      }
    }
  },

  components: {
    button: {
      css: `
      .p-button-outlined:not(.p-button-secondary):not(.p-button-success):not(.p-button-info):not(.p-button-warn):not(.p-button-help):not(.p-button-danger):not(.p-button-contrast):not(.p-button-plain):not(:disabled):hover,
      .p-button-outlined:not(.p-button-secondary):not(.p-button-success):not(.p-button-info):not(.p-button-warn):not(.p-button-help):not(.p-button-danger):not(.p-button-contrast):not(.p-button-plain):not(:disabled):active {
        color: var(--p-button-primary-color) !important;
      }
      `
    },
    selectbutton: {
      css: `
      .p-selectbutton{
              border-radius: 2rem !important;
              background: var(--color-surface-100) !important;
              display:flex !important;
    }
      .p-togglebutton{
              border-radius: 50% !important;
              padding: 0.2rem !important;
      }
      .p-togglebutton-content{
        font-size: 10px !important;
        font-weight: 400 !important;
        line-height: 11px !important;
        padding: .5rem .6rem !important;
        flex-grow: 1 !important;
      }
      .p-togglebutton-checked .p-togglebutton-content{
      background: var(--color-primary-500) !important;
      color:var(--color-surface-100) !important;
      border-radius: 50% !important;
      .p-togglebutton-label{
        color: var(--p-button-primary-color) !important;
      }
      }
      .p-togglebutton-label{
              font-size:10px;
              color: var(--color-content);
      }
      `
    },
    radiobutton: {
      css: `
      .p-radiobutton-checked .p-radiobutton-box .p-radiobutton-icon{
            transform:none !important;
            background: var(--color-primary-500) !important;
        }
      .p-radiobutton{
        .p-radiobutton-box{
        border: 1px solid var(--color-primary-500);
        background: var(--color-surface-0);
        border-radius: 50%;
        }
      }
      `
    },
    paginator: {
      css: `
      .p-paginator{
        background:transparent !important;
      }
        .p-paginator-page.p-paginator-page-selected{
        color: var(--p-button-primary-color) !important;
        background: var(--color-primary-500) !important;
        }
      `
    },
    floatlabel: {
      css: `
      .p-floatlabel-on:has(input:focus) label{
        background:var(--color-surface-50)
      }
        .p-floatlabel-on:has(input.p-filled) label{
          background:var(--color-surface-50)
        }
        .p-floatlabel-on:has(.p-inputwrapper-focus) label{
          background:var(--color-surface-50)
        }
        .p-floatlabel-on:has(input[placeholder]) label{
          background:var(--color-surface-50)
        }
        .p-floatlabel-on:has(.p-inputwrapper-filled) label{
          background:var(--color-surface-50)
        }
        .p-floatlabel-on:has(textarea:focus) label{
          background:var(--color-surface-50)
        }
        .p-floatlabel-on:has(textarea.p-filled) label{
          background:var(--color-surface-50)
        }
      `
    },
    inputtext: {
      css: `
        .p-inputtext{
          background:var(--color-surface-50)
        }
      `
    },
    textarea: {
      css: `
        .p-textarea{
          background:var(--color-surface-50)
        }
      `
    },
    dialog: {
      css: `
        .p-dialog{
          background:var(--color-surface-50);
        }
      `
    },
    drawer: {
      css: `
        .p-drawer{
          background:var(--color-surface-50);
        }
      `
    },
    select: {
      css: `
        .p-select{
                    background:var(--color-surface-50);
        }
      `
    },
    stepper: {
      css: `
        .p-steplist{
        padding: 1.1rem;
        }
        .p-step{
          gap:0;
          padding:0;
        }
        .p-stepper-separator {
    background-color: #9b9da3;
    width: 100%;
    height: 2px;
    transition: box-shadow 0.2s;
  }
      `
    },
    message: {
      css: `
        .p-message-text{
          font-size: 12px;
        }
      `
    }
  }
})

export default theme
