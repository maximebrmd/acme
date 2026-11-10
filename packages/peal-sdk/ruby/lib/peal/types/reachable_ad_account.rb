# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReachableAdAccount < Internal::Types::Model
      field :connected, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :currency, -> { String }, optional: false, nullable: false

      field :external_id, -> { String }, optional: false, nullable: false, api_name: "externalId"

      field :name, -> { String }, optional: false, nullable: false

      field :spend_cap, -> { Integer }, optional: false, nullable: true, api_name: "spendCap"

      field :status, -> { Peal::Types::AdAccountStatus }, optional: false, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: true, api_name: "timeZone"

      field :unsupported, -> { Peal::Types::AdAccountUnsupported }, optional: false, nullable: true
    end
  end
end
