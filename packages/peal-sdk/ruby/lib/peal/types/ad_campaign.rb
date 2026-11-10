# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdCampaign < Internal::Types::Model
      field :daily_budget, -> { Integer }, optional: false, nullable: true, api_name: "dailyBudget"

      field :ends_at, -> { String }, optional: false, nullable: true, api_name: "endsAt"

      field :external_id, -> { String }, optional: false, nullable: false, api_name: "externalId"

      field :name, -> { String }, optional: false, nullable: false

      field :objective, -> { Peal::Types::CampaignObjective }, optional: false, nullable: false

      field :raw_status, -> { String }, optional: false, nullable: false, api_name: "rawStatus"

      field :starts_at, -> { String }, optional: false, nullable: true, api_name: "startsAt"

      field :status, -> { Peal::Types::AdObjectStatus }, optional: false, nullable: false

      field :synced_at, -> { String }, optional: false, nullable: false, api_name: "syncedAt"

      field :total_budget, -> { Integer }, optional: false, nullable: true, api_name: "totalBudget"

      field :totals, -> { Peal::Types::PaidTotals }, optional: false, nullable: false
    end
  end
end
