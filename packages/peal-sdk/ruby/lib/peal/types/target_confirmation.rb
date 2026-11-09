# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TargetConfirmation < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::TargetConfirmationPublished }, key: "PUBLISHED"

      member -> { Peal::Types::TargetConfirmationNotPublished }, key: "NOT_PUBLISHED"
    end
  end
end
