# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdAccount < Internal::Types::Model
      field :access, -> { Peal::Types::AdAccess }, optional: false, nullable: false

      field :amount_spent, -> { Integer }, optional: false, nullable: true, api_name: "amountSpent"

      field :connected_at, -> { String }, optional: false, nullable: false, api_name: "connectedAt"

      field :connection_id, -> { String }, optional: false, nullable: false, api_name: "connectionId"

      field :currency, -> { String }, optional: false, nullable: false

      field :external_id, -> { String }, optional: false, nullable: false, api_name: "externalId"

      field :id, -> { String }, optional: false, nullable: false

      field :minor_unit_digits, -> { Float }, optional: false, nullable: false, api_name: "minorUnitDigits"

      field :monthly_ceiling, -> { Integer }, optional: false, nullable: true, api_name: "monthlyCeiling"

      field :name, -> { String }, optional: false, nullable: false

      field :network, -> { Peal::Types::AdNetwork }, optional: false, nullable: false

      field :new_ads_untracked_until, -> { String }, optional: true, nullable: true, api_name: "newAdsUntrackedUntil"

      field :spend_cap, -> { Integer }, optional: false, nullable: true, api_name: "spendCap"

      field :spending_enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "spendingEnabled"

      field :status, -> { Peal::Types::AdAccountStatus }, optional: false, nullable: false

      field :synced_at, -> { String }, optional: false, nullable: true, api_name: "syncedAt"

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"
    end
  end
end
