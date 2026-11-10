# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdAuditEntryBy < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :kind, -> { Peal::Types::AdAuditEntryByKind }, optional: false, nullable: false

      field :via_client, -> { String }, optional: false, nullable: true, api_name: "viaClient"
    end
  end
end
