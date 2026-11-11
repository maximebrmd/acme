# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WorkspaceUsageReport < Internal::Types::Model
      field :allowances, -> { Peal::Types::PlanAllowances }, optional: false, nullable: true

      field :current, -> { Peal::Types::Usage }, optional: false, nullable: false

      field :days, -> { Internal::Types::Array[Peal::Types::UsageDay] }, optional: false, nullable: false

      field :period, -> { Peal::Types::UsagePeriod }, optional: false, nullable: false

      field :plan, -> { Peal::Types::Plan }, optional: false, nullable: true

      field :shared_with, -> { Peal::Types::UsageSharing }, optional: false, nullable: true, api_name: "sharedWith"

      field :totals, -> { Peal::Types::UsageTotals }, optional: false, nullable: false
    end
  end
end
