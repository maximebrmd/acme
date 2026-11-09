# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TargetConfirmationPublished < Internal::Types::Model
      field :permalink, -> { String }, optional: false, nullable: true
    end
  end
end
