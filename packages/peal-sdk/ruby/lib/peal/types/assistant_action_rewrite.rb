# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AssistantActionRewrite < Internal::Types::Model
      field :tone, -> { Peal::Types::AssistantTone }, optional: false, nullable: false
    end
  end
end
