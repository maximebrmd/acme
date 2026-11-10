# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PostSort
      extend Peal::Internal::Types::Enum

      CREATED_DESC = "createdDesc"
      CREATED_ASC = "createdAsc"
      SCHEDULED_DESC = "scheduledDesc"
      SCHEDULED_ASC = "scheduledAsc"
    end
  end
end
