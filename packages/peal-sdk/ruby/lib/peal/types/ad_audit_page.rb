# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdAuditPage < Internal::Types::Model
      field :entries, -> { Internal::Types::Array[Peal::Types::AdAuditEntry] }, optional: false, nullable: false

      field :next_cursor, -> { String }, optional: false, nullable: true, api_name: "nextCursor"
    end
  end
end
