export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'super_admin' | 'admin' | 'client'
export type ClientStatus = 'lead' | 'onboarding' | 'active' | 'past_due' | 'paused' | 'churned'
export type AssetType = 'domain' | 'registrar' | 'dns' | 'github_repo' | 'google_account' | 'hosting' | 'analytics' | 'email' | 'other'
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
export type RequestType = 'contact_info' | 'copy_edit' | 'image_swap' | 'link_fix' | 'other'
export type RequestStatus = 'new' | 'in_progress' | 'needs_client_input' | 'done' | 'rejected'
export type SubStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused' | 'incomplete' | 'incomplete_expired' | 'unpaid'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          default_price_cents: number
          default_currency: string
          suspended: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          default_price_cents?: number
          default_currency?: string
          suspended?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          default_price_cents?: number
          default_currency?: string
          suspended?: boolean
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          org_id: string | null
          client_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: UserRole
          org_id?: string | null
          client_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          org_id?: string | null
          client_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          org_id: string
          business_name: string
          contact_name: string | null
          email: string
          phone: string | null
          country: string | null
          vat_id: string | null
          status: ClientStatus
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          purchase_date: string | null
          plan_price_cents: number | null
          currency: string | null
          setup_fee_cents: number | null
          churn_reason: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          business_name: string
          contact_name?: string | null
          email: string
          phone?: string | null
          country?: string | null
          vat_id?: string | null
          status?: ClientStatus
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          purchase_date?: string | null
          plan_price_cents?: number | null
          currency?: string | null
          setup_fee_cents?: number | null
          churn_reason?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          business_name?: string
          contact_name?: string | null
          email?: string
          phone?: string | null
          country?: string | null
          vat_id?: string | null
          status?: ClientStatus
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          purchase_date?: string | null
          plan_price_cents?: number | null
          currency?: string | null
          setup_fee_cents?: number | null
          churn_reason?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      client_assets: {
        Row: {
          id: string
          client_id: string
          org_id: string
          type: AssetType
          label: string
          value: string | null
          url: string | null
          vault_ref: string | null
          expires_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          org_id: string
          type: AssetType
          label: string
          value?: string | null
          url?: string | null
          vault_ref?: string | null
          expires_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          org_id?: string
          type?: AssetType
          label?: string
          value?: string | null
          url?: string | null
          vault_ref?: string | null
          expires_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          stripe_subscription_id: string
          client_id: string
          org_id: string
          status: SubStatus
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          latest_invoice_id: string | null
          updated_at: string
        }
        Insert: {
          stripe_subscription_id: string
          client_id: string
          org_id: string
          status: SubStatus
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          latest_invoice_id?: string | null
          updated_at?: string
        }
        Update: {
          stripe_subscription_id?: string
          client_id?: string
          org_id?: string
          status?: SubStatus
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          latest_invoice_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          stripe_invoice_id: string
          client_id: string
          org_id: string
          amount_cents: number
          currency: string
          status: InvoiceStatus
          due_date: string | null
          paid_at: string | null
          attempt_count: number
          hosted_invoice_url: string | null
          invoice_pdf: string | null
          billing_month: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          stripe_invoice_id: string
          client_id: string
          org_id: string
          amount_cents: number
          currency: string
          status: InvoiceStatus
          due_date?: string | null
          paid_at?: string | null
          attempt_count?: number
          hosted_invoice_url?: string | null
          invoice_pdf?: string | null
          billing_month?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          stripe_invoice_id?: string
          client_id?: string
          org_id?: string
          amount_cents?: number
          currency?: string
          status?: InvoiceStatus
          due_date?: string | null
          paid_at?: string | null
          attempt_count?: number
          hosted_invoice_url?: string | null
          invoice_pdf?: string | null
          billing_month?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      change_requests: {
        Row: {
          id: string
          client_id: string
          org_id: string
          submitted_by: string | null
          type: RequestType
          description: string
          target_page: string | null
          status: RequestStatus
          admin_note: string | null
          billing_month: string
          attachment_url: string | null
          requested_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          org_id: string
          submitted_by?: string | null
          type: RequestType
          description: string
          target_page?: string | null
          status?: RequestStatus
          admin_note?: string | null
          billing_month: string
          attachment_url?: string | null
          requested_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          org_id?: string
          submitted_by?: string | null
          type?: RequestType
          description?: string
          target_page?: string | null
          status?: RequestStatus
          admin_note?: string | null
          billing_month?: string
          attachment_url?: string | null
          requested_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          stripe_event_id: string
          type: string
          received_at: string
          processed_at: string | null
        }
        Insert: {
          stripe_event_id: string
          type: string
          received_at?: string
          processed_at?: string | null
        }
        Update: {
          stripe_event_id?: string
          type?: string
          received_at?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          id: number
          org_id: string | null
          client_id: string | null
          actor: string | null
          action: string
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          org_id?: string | null
          client_id?: string | null
          actor?: string | null
          action: string
          payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          org_id?: string | null
          client_id?: string | null
          actor?: string | null
          action?: string
          payload?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      client_lifetime_value: {
        Row: {
          client_id: string
          org_id: string
          total_paid_cents: number
          total_paid: number
          last_paid_at: string | null
        }
        Relationships: []
      }
      org_mrr: {
        Row: {
          org_id: string
          active_clients: number
          mrr_cents: number
        }
        Relationships: []
      }
    }
    Functions: {
      change_requests_this_month: {
        Args: { p_client_id: string; p_billing_month: string }
        Returns: number
      }
    }
    Enums: {
      user_role: UserRole
      client_status: ClientStatus
      asset_type: AssetType
      invoice_status: InvoiceStatus
      request_type: RequestType
      request_status: RequestStatus
      sub_status: SubStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
