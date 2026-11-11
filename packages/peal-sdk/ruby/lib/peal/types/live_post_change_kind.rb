# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module LivePostChangeKind
      extend Peal::Internal::Types::Enum

      UNPUBLISH = "unpublish"
      EDIT = "edit"
    end
  end
end
