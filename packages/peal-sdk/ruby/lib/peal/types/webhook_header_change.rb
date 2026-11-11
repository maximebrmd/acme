# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookHeaderChange < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :value, -> { String }, optional: true, nullable: false
    end
  end
end
