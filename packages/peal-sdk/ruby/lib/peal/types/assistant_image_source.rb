# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AssistantImageSource
      extend Peal::Internal::Types::Enum

      WORKSPACE = "workspace"
      SERVER = "server"
    end
  end
end
