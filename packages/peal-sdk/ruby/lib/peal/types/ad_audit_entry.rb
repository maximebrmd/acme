# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdAuditEntry < Internal::Types::Model
      field :account_id, -> { String }, optional: false, nullable: true, api_name: "accountId"

      field :action, -> { Peal::Types::AdAuditAction }, optional: false, nullable: false

      field :amounts, -> { Internal::Types::Hash[String, Integer] }, optional: false, nullable: false

      field :at, -> { String }, optional: false, nullable: false

      field :boost_id, -> { String }, optional: false, nullable: true, api_name: "boostId"

      field :by, -> { Peal::Types::AdAuditEntryBy }, optional: false, nullable: true

      field :currency, -> { String }, optional: false, nullable: true

      field :id, -> { String }, optional: false, nullable: false
    end
  end
end
