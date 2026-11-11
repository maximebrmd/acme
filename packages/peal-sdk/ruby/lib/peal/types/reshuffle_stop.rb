# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ReshuffleStop
      extend Peal::Internal::Types::Enum

      PLAN_LIMIT = "planLimit"
      FULL = "full"
      CHANGED = "changed"
    end
  end
end
