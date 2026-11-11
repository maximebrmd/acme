# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookHeader < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :value, -> { String }, optional: false, nullable: false
    end
  end
end
