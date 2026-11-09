# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AssistantActionShorten < Internal::Types::Model
      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false
    end
  end
end
