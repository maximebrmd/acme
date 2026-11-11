# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InstagramTrialReel
      extend Peal::Internal::Types::Enum

      MANUAL = "manual"
      PERFORMANCE = "performance"
    end
  end
end
