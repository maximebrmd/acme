# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class XUsage < Internal::Types::Model
      field :reads, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :set_at, -> { String }, optional: false, nullable: true, api_name: "setAt"
    end
  end
end
