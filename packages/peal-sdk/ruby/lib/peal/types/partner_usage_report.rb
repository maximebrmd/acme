# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PartnerUsageReport < Internal::Types::Model
      field :allowances, -> { Peal::Types::PlanAllowances }, optional: false, nullable: true

      field :current, -> { Peal::Types::PartnerHoldings }, optional: false, nullable: true

      field :days, -> { Internal::Types::Array[Peal::Types::PartnerUsageReportDay] }, optional: false, nullable: true

      field :period, -> { Peal::Types::UsagePeriod }, optional: false, nullable: false

      field :plan, -> { Peal::Types::Plan }, optional: false, nullable: true

      field :totals, -> { Peal::Types::UsageTotals }, optional: false, nullable: true

      field :workspaces, -> { Peal::Types::TenantUsagePage }, optional: false, nullable: false
    end
  end
end
